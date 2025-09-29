-- Setup Phases System for Aloa Project Manager
-- This script creates the phases table and updates projectlets to support phase grouping

-- 1. Create the phases table
CREATE TABLE IF NOT EXISTS aloa_project_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    phase_order INTEGER NOT NULL DEFAULT 0,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT 'purple',
    triggers_payment BOOLEAN DEFAULT false,
    payment_amount DECIMAL(10,2),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'on_hold')),
    completion_percentage NUMERIC(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(project_id, phase_order)
);

-- 2. Add phase_id to projectlets table
ALTER TABLE aloa_projectlets
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES aloa_project_phases(id) ON DELETE SET NULL;

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projectlets_phase_id ON aloa_projectlets(phase_id);
CREATE INDEX IF NOT EXISTS idx_phases_project_id ON aloa_project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_phases_order ON aloa_project_phases(project_id, phase_order);

-- 4. Create function to update phase completion percentage
CREATE OR REPLACE FUNCTION update_phase_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the completion percentage for the phase
    UPDATE aloa_project_phases
    SET completion_percentage = (
        SELECT
            CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100
            END
        FROM aloa_projectlets
        WHERE phase_id = COALESCE(NEW.phase_id, OLD.phase_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.phase_id, OLD.phase_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically update phase completion
DROP TRIGGER IF EXISTS trigger_update_phase_completion ON aloa_projectlets;
CREATE TRIGGER trigger_update_phase_completion
AFTER INSERT OR UPDATE OF status, phase_id OR DELETE ON aloa_projectlets
FOR EACH ROW
EXECUTE FUNCTION update_phase_completion();

-- 6. Create function to reorder phases
CREATE OR REPLACE FUNCTION reorder_phases(
    p_project_id UUID,
    p_phase_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
    v_phase_id UUID;
    v_index INTEGER;
BEGIN
    v_index := 0;
    FOREACH v_phase_id IN ARRAY p_phase_ids
    LOOP
        UPDATE aloa_project_phases
        SET phase_order = v_index,
            updated_at = NOW()
        WHERE id = v_phase_id AND project_id = p_project_id;

        v_index := v_index + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Create view for phase overview with statistics
CREATE OR REPLACE VIEW aloa_phase_overview AS
SELECT
    p.*,
    COUNT(DISTINCT pl.id) as total_projectlets,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'completed') as completed_projectlets,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'in_progress') as in_progress_projectlets,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'locked') as locked_projectlets,
    COALESCE(SUM(
        CASE
            WHEN pl.status = 'completed' THEN 100
            WHEN pl.status = 'in_progress' THEN 50
            ELSE 0
        END
    ) / NULLIF(COUNT(pl.id), 0), 0) as calculated_completion
FROM aloa_project_phases p
LEFT JOIN aloa_projectlets pl ON pl.phase_id = p.id
GROUP BY p.id;

-- 8. Add some sample phases for existing projects (optional - you can comment this out if not needed)
-- This will create default phases for any projects that don't have phases yet
DO $$
DECLARE
    v_project RECORD;
    v_phase_id UUID;
BEGIN
    -- Loop through projects that don't have phases
    FOR v_project IN
        SELECT p.id, p.project_name
        FROM aloa_projects p
        WHERE NOT EXISTS (
            SELECT 1 FROM aloa_project_phases ph WHERE ph.project_id = p.id
        )
    LOOP
        -- Create Phase 1: Discovery & Planning
        INSERT INTO aloa_project_phases (
            project_id, name, description, phase_order, icon, color
        ) VALUES (
            v_project.id,
            'Discovery & Planning',
            'Initial research, requirements gathering, and project planning',
            0,
            'search',
            'blue'
        );

        -- Create Phase 2: Design
        INSERT INTO aloa_project_phases (
            project_id, name, description, phase_order, icon, color, triggers_payment, payment_amount
        ) VALUES (
            v_project.id,
            'Design',
            'UI/UX design, wireframes, and visual design creation',
            1,
            'palette',
            'purple',
            true,
            2500.00
        );

        -- Create Phase 3: Development
        INSERT INTO aloa_project_phases (
            project_id, name, description, phase_order, icon, color
        ) VALUES (
            v_project.id,
            'Development',
            'Building and implementing the website functionality',
            2,
            'code',
            'green'
        );

        -- Create Phase 4: Testing & Launch
        INSERT INTO aloa_project_phases (
            project_id, name, description, phase_order, icon, color, triggers_payment, payment_amount
        ) VALUES (
            v_project.id,
            'Testing & Launch',
            'Quality assurance, testing, and deployment',
            3,
            'rocket',
            'orange',
            true,
            2500.00
        );

        RAISE NOTICE 'Created default phases for project: %', v_project.project_name;
    END LOOP;
END $$;

-- 9. Grant appropriate permissions
GRANT ALL ON aloa_project_phases TO authenticated;
GRANT ALL ON aloa_phase_overview TO authenticated;

-- 10. Add RLS policies for phases
ALTER TABLE aloa_project_phases ENABLE ROW LEVEL SECURITY;

-- Policy for viewing phases (anyone authenticated can view)
CREATE POLICY "Users can view phases for projects they have access to"
ON aloa_project_phases FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM aloa_projects p
        WHERE p.id = aloa_project_phases.project_id
    )
);

-- Policy for creating/updating/deleting phases (only admins)
CREATE POLICY "Admins can manage phases"
ON aloa_project_phases FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phases system has been successfully set up!';
    RAISE NOTICE 'Tables created: aloa_project_phases';
    RAISE NOTICE 'Columns added: phase_id to aloa_projectlets';
    RAISE NOTICE 'Functions created: update_phase_completion(), reorder_phases()';
    RAISE NOTICE 'Views created: aloa_phase_overview';
    RAISE NOTICE 'Default phases have been added to existing projects';
END $$;