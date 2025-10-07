# Development Server Notes

## After Merging from Main

**IMPORTANT:** The development server often needs a clean restart after merging from main branch.

### Symptoms:
- Login form doesn't respond when clicking submit
- Pages load but API calls fail silently
- Hot reload stops working
- General unresponsiveness

### Solution - Clean Restart:

```bash
# 1. Kill all Next.js dev processes
pkill -f "next dev"

# 2. Clear the Next.js build cache
rm -rf .next

# 3. Restart the development server
npm run dev
```

Or as a one-liner:
```bash
pkill -f "next dev" && rm -rf .next && npm run dev
```

### Why This Happens:
- The `.next` cache directory can contain stale compiled files after a merge
- Module resolution can get confused when files move or change significantly
- Background processes from before the merge may still be running
- Next.js doesn't always detect that a full rebuild is needed

### Confirmation Checklist:
After restarting, verify the server is working by checking:
1. ✅ Terminal shows: `✓ Ready in XXXms`
2. ✅ No error messages in terminal
3. ✅ Login form is responsive (clicking submit triggers API call)
4. ✅ Check Network tab in browser dev tools - API calls should return 200/201 status
5. ✅ Hot reload works (make a small change and see if it updates)

### Additional Troubleshooting:
If the clean restart doesn't work:
1. Check if port 3000 is already in use: `lsof -i :3000`
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check environment variables are loaded: `.env.local` file exists
4. Verify Supabase connection by checking the terminal for connection logs