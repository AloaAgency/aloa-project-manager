'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  Circle, 
  Lock, 
  PlayCircle, 
  Clock, 
  Trophy, 
  Zap,
  ChevronRight,
  Calendar,
  User,
  FileText,
  Palette,
  Code,
  Star,
  Target,
  Award
} from 'lucide-react';

const PROJECTLET_ICONS = {
  milestone: Trophy,
  form: FileText,
  design: Palette,
  content: FileText,
  review: CheckCircle,
  development: Code
};

const STATUS_COLORS = {
  locked: 'bg-gray-100 text-gray-400 border-gray-200',
  available: 'bg-[#faf8f3] text-black border-black hover:bg-[#f5f1e8]',
  in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  client_review: 'bg-blue-50 text-blue-700 border-blue-300',
  completed: 'bg-green-50 text-green-700 border-green-300'
};

export default function ProjectDashboard() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [projectlets, setProjectlets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    fetchProjectData();
  }, [params.projectId]);

  const fetchProjectData = async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/aloa-projects/${params.projectId}`);
      const projectData = await projectRes.json();
      setProject(projectData);

      // Fetch projectlets
      const projectletsRes = await fetch(`/api/aloa-projects/${params.projectId}/projectlets`);
      const projectletsData = await projectletsRes.json();
      setProjectlets(projectletsData.projectlets);
      setStats(projectletsData.stats);

      // Check for achievements
      checkAchievements(projectletsData.stats);
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAchievements = (stats) => {
    const newAchievements = [];
    
    if (stats.completed >= 1 && stats.completed < 5) {
      newAchievements.push({
        icon: Star,
        title: 'First Steps',
        description: 'Completed your first projectlet!'
      });
    }
    
    if (stats.completed >= 5) {
      newAchievements.push({
        icon: Zap,
        title: 'On Fire',
        description: '5 projectlets completed!'
      });
    }
    
    if (stats.completionPercentage >= 50) {
      newAchievements.push({
        icon: Target,
        title: 'Halfway There',
        description: '50% of the project complete!'
      });
    }
    
    if (stats.completionPercentage === 100) {
      newAchievements.push({
        icon: Trophy,
        title: 'Project Champion',
        description: 'All projectlets completed!'
      });
    }
    
    setAchievements(newAchievements);
  };

  const handleProjectletClick = (projectlet) => {
    if (projectlet.status === 'locked') {
      return; // Can't click locked projectlets
    }
    
    if (projectlet.type === 'form' && projectlet.aloa_project_forms?.[0]) {
      // Navigate to form
      router.push(`/project/${params.projectId}/form/${projectlet.aloa_project_forms[0].id}`);
    } else {
      // Navigate to projectlet detail
      router.push(`/project/${params.projectId}/projectlet/${projectlet.id}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'in_progress':
        return <PlayCircle className="w-5 h-5" />;
      case 'available':
        return <Circle className="w-5 h-5" />;
      case 'locked':
        return <Lock className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">
            {project?.project_name}
          </h1>
          <div className="flex items-center gap-6 text-gray-700">
            <span className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              {project?.client_name}
            </span>
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Due: {project?.estimated_completion_date ? 
                new Date(project.estimated_completion_date).toLocaleDateString() : 
                'TBD'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Overall Progress</h2>
            <span className="text-3xl font-bold">{stats?.completionPercentage || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-black to-gray-700 rounded-full transition-all duration-500 flex items-center justify-end pr-4"
              style={{ width: `${stats?.completionPercentage || 0}%` }}
            >
              {stats?.completionPercentage >= 10 && (
                <span className="text-white text-sm font-semibold">
                  {stats?.completed || 0} / {stats?.total || 0}
                </span>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats?.inProgress || 0}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.available || 0}</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{stats?.locked || 0}</div>
              <div className="text-sm text-gray-600">Locked</div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl shadow-lg p-8 mb-8 border-2 border-yellow-200">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Award className="w-8 h-8 mr-2 text-yellow-600" />
              Achievements Unlocked!
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <div key={index} className="bg-white rounded-lg p-4 text-center">
                    <Icon className="w-12 h-12 mx-auto mb-2 text-yellow-600" />
                    <h3 className="font-bold text-sm">{achievement.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Projectlets Grid */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Project Roadmap</h2>
          
          <div className="space-y-4">
            {projectlets.map((projectlet, index) => {
              const Icon = PROJECTLET_ICONS[projectlet.type] || FileText;
              const isClickable = projectlet.status !== 'locked';
              
              return (
                <div
                  key={projectlet.id}
                  onClick={() => handleProjectletClick(projectlet)}
                  className={`
                    border-2 rounded-xl p-6 transition-all
                    ${STATUS_COLORS[projectlet.status]}
                    ${isClickable ? 'cursor-pointer transform hover:scale-[1.02]' : 'cursor-not-allowed opacity-60'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black/5">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold flex items-center">
                          {projectlet.name}
                          {projectlet.deadline && (
                            <span className="ml-3 text-sm font-normal flex items-center text-gray-600">
                              <Clock className="w-4 h-4 mr-1" />
                              Due: {new Date(projectlet.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-600">
                            Step {index + 1} of {projectlets.length}
                          </span>
                          <span className={`
                            px-2 py-1 rounded-full text-xs font-semibold
                            ${projectlet.status === 'completed' ? 'bg-green-100 text-green-700' :
                              projectlet.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                              projectlet.status === 'available' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-500'}
                          `}>
                            {formatStatus(projectlet.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(projectlet.status)}
                      {isClickable && <ChevronRight className="w-5 h-5" />}
                    </div>
                  </div>
                  
                  {/* Progress indicator for forms */}
                  {projectlet.aloa_project_forms?.[0] && (
                    <div className="mt-4 ml-16">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Responses</span>
                        <span>
                          {projectlet.aloa_project_forms[0].responses_received || 0} / {projectlet.aloa_project_forms[0].responses_required || 1}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-full bg-black rounded-full"
                          style={{ 
                            width: `${Math.min(100, 
                              ((projectlet.aloa_project_forms[0].responses_received || 0) / 
                               (projectlet.aloa_project_forms[0].responses_required || 1)) * 100
                            )}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Preview */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="text-center text-gray-500 py-8">
            Timeline events will appear here
          </div>
        </div>
      </div>
    </div>
  );
}