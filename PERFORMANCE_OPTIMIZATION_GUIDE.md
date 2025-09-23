# Performance Optimization Guide for Aloa Web Design Project Manager

## Overview
This guide provides a step-by-step approach to optimize the performance of the Aloa Web Design Project Manager application. Each optimization can be implemented independently to avoid breaking changes and context window limitations.

## Phase 1: Quick Wins (1-2 hours each)

### 1.1 Enable Next.js Production Optimizations ✅
**Priority: HIGH | Impact: HIGH | Risk: LOW**
**Status: COMPLETED**

#### Steps:
1. ✅ Update `next.config.js` to enable SWC minification:
```javascript
module.exports = {
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
}
```

2. ✅ Add image optimization:
```javascript
images: {
  domains: ['your-supabase-url.supabase.co'],
  formats: ['image/avif', 'image/webp'],
}
```

### 1.2 Implement React Component Memoization ✅
**Priority: HIGH | Impact: MEDIUM | Risk: LOW**
**Status: PARTIALLY COMPLETED**

#### Target Components (one at a time):
1. `/components/SitemapBuilderV2.js` - Heavy drag-and-drop operations ✅ COMPLETED
2. `/components/ProjectletAppletsManager.js` - Complex state management
3. `/components/FormBuilder.js` - Large form rendering

#### Pattern:
```javascript
// Wrap expensive components
export default React.memo(ComponentName, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  return prevProps.id === nextProps.id;
});

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);
```

### 1.3 Optimize Database Queries
**Priority: HIGH | Impact: HIGH | Risk: LOW**

#### Add Database Indexes (run one at a time in Supabase):
```sql
-- /supabase/performance_indexes.sql
CREATE INDEX IF NOT EXISTS idx_aloa_projects_status ON aloa_projects(status);
CREATE INDEX IF NOT EXISTS idx_aloa_projectlets_project_order ON aloa_projectlets(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_aloa_applet_progress_user_applet ON aloa_applet_progress(user_id, applet_id);
CREATE INDEX IF NOT EXISTS idx_aloa_project_knowledge_project ON aloa_project_knowledge(project_id, category);
```

## Phase 2: Bundle Size Reduction (2-3 hours each)

### 2.1 Implement Dynamic Imports
**Priority: MEDIUM | Impact: HIGH | Risk: MEDIUM**

#### Convert Heavy Components to Dynamic Loading:
```javascript
// Instead of: import HeavyComponent from './HeavyComponent'
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false // For client-only components
});
```

#### Priority Components:
1. PDF generation (`jsPDF`)
2. Rich text editors
3. Chart/visualization libraries
4. AI chat interfaces

### 2.2 Optimize Dependencies
**Priority: MEDIUM | Impact: MEDIUM | Risk: LOW**

#### Steps:
1. Run bundle analyzer:
```bash
npm install --save-dev @next/bundle-analyzer
```

2. Add to `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({...config})
```

3. Analyze: `ANALYZE=true npm run build`

4. Replace heavy libraries:
- Consider `date-fns` instead of `moment`
- Use native fetch instead of `axios` where possible
- Lazy-load Anthropic SDK only when needed

## Phase 3: Client-Side Performance (3-4 hours each)

### 3.1 Implement Virtual Scrolling
**Priority: MEDIUM | Impact: HIGH | Risk: MEDIUM**

#### For Long Lists:
- Form responses table
- Project list views
- User management tables

#### Implementation with `react-window`:
```javascript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {Row}
</FixedSizeList>
```

### 3.2 Debounce/Throttle Expensive Operations
**Priority: HIGH | Impact: MEDIUM | Risk: LOW**

#### Target Areas:
1. Search inputs
2. Auto-save in forms
3. Drag-and-drop operations
4. Window resize handlers

#### Pattern:
```javascript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSave = useMemo(
  () => debounce(saveFunction, 2000),
  []
);
```

## Phase 4: API & Network Optimization (2-3 hours each)

### 4.1 Implement API Response Caching
**Priority: HIGH | Impact: HIGH | Risk: LOW**

#### Add to API routes:
```javascript
// For static/semi-static content
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

// For user-specific content
res.setHeader('Cache-Control', 'private, max-age=30');
```

### 4.2 Implement SWR or React Query
**Priority: MEDIUM | Impact: HIGH | Risk: MEDIUM**

#### Benefits:
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication

#### Example with SWR:
```javascript
import useSWR from 'swr';

const { data, error, mutate } = useSWR(
  `/api/projects/${projectId}`,
  fetcher,
  {
    refreshInterval: 30000, // 30 seconds
    revalidateOnFocus: false,
  }
);
```

## Phase 5: State Management Optimization (4-5 hours)

### 5.1 Implement Zustand for Global State
**Priority: LOW | Impact: MEDIUM | Risk: MEDIUM**

#### Replace prop drilling with lightweight state:
```javascript
import { create } from 'zustand';

const useProjectStore = create((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(p =>
      p.id === id ? { ...p, ...updates } : p
    )
  })),
}));
```

## Phase 6: Database Query Optimization (3-4 hours each)

### 6.1 Implement Query Batching
**Priority: MEDIUM | Impact: HIGH | Risk: MEDIUM**

#### Pattern for Multiple Queries:
```javascript
// Instead of multiple await calls
const [projects, members, knowledge] = await Promise.all([
  supabase.from('aloa_projects').select(),
  supabase.from('aloa_project_members').select(),
  supabase.from('aloa_project_knowledge').select()
]);
```

### 6.2 Add Pagination
**Priority: HIGH | Impact: HIGH | Risk: LOW**

#### Implement for:
- Form responses
- Project listings
- Knowledge items

#### Pattern:
```javascript
const PAGE_SIZE = 20;
const { data, count } = await supabase
  .from('table')
  .select('*', { count: 'exact' })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

## Phase 7: Build & Deploy Optimization (1-2 hours)

### 7.1 Optimize Build Process
**Priority: LOW | Impact: MEDIUM | Risk: LOW**

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'date-fns'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}
```

### 7.2 Enable ISR (Incremental Static Regeneration)
**Priority: LOW | Impact: MEDIUM | Risk: LOW**

For semi-static pages:
```javascript
export async function generateStaticParams() {
  // Generate paths at build time
}

export const revalidate = 3600; // Revalidate every hour
```

## Monitoring & Measurement

### Tools to Use:
1. **Lighthouse CI** - Automated performance testing
2. **Vercel Analytics** - Real user metrics
3. **Sentry** - Error and performance monitoring
4. **React DevTools Profiler** - Component render analysis

### Key Metrics to Track:
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.8s
- Cumulative Layout Shift (CLS) < 0.1
- First Input Delay (FID) < 100ms

## Implementation Schedule

### Week 1: Foundation
- [x] Day 1-2: Phase 1.1 (Next.js config) ✅ COMPLETED
- [x] Day 1-2: Phase 1.2 (memoization) ✅ PARTIALLY COMPLETED (SitemapBuilderV2)
- [ ] Day 3-4: Phase 1.3 (Database indexes)
- [ ] Day 5: Measure baseline metrics

### Week 2: Bundle Optimization
- [ ] Day 1-2: Phase 2.1 (Dynamic imports)
- [ ] Day 3-4: Phase 2.2 (Dependency optimization)
- [ ] Day 5: Bundle analysis and cleanup

### Week 3: Runtime Performance
- [ ] Day 1-2: Phase 3.1 (Virtual scrolling)
- [ ] Day 3-4: Phase 3.2 (Debouncing)
- [ ] Day 5: Performance testing

### Week 4: Network & API
- [ ] Day 1-2: Phase 4.1 (API caching)
- [ ] Day 3-4: Phase 4.2 (SWR implementation)
- [ ] Day 5: Network waterfall analysis

### Ongoing: Advanced Optimizations
- Implement remaining phases as needed
- Continuous monitoring and adjustment

## Testing Each Optimization

### Before Implementation:
1. Record current metrics (use Lighthouse)
2. Note any specific slow operations
3. Create a performance baseline

### After Implementation:
1. Run same metrics test
2. Compare results
3. Rollback if performance degrades
4. Document improvements

### Testing Commands:
```bash
# Clean build for testing
rm -rf .next
npm run build
npm run start

# Analyze bundle
ANALYZE=true npm run build

# Run Lighthouse
npx lighthouse http://localhost:3000 --view
```

## Common Pitfalls to Avoid

1. **Don't optimize prematurely** - Measure first
2. **Avoid over-memoization** - Can cause memory issues
3. **Test on slow devices** - Not just dev machines
4. **Consider mobile first** - Most constraints
5. **Keep accessibility** - Performance shouldn't hurt UX
6. **Maintain SEO** - Dynamic loading affects crawlers

## Quick Reference Checklist

### Before Deploy:
- [ ] Remove console.logs
- [ ] Enable production builds
- [ ] Test on slow 3G
- [ ] Check bundle size < 500KB initial
- [ ] Verify lazy loading works
- [ ] Test error boundaries
- [ ] Confirm API caching headers

### Monthly Review:
- [ ] Analyze performance metrics
- [ ] Review slow queries
- [ ] Update dependencies
- [ ] Clean unused code
- [ ] Review error logs
- [ ] Check memory usage

## Resources

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/reference/react/memo)
- [Supabase Performance](https://supabase.com/docs/guides/performance)