<task name="Instagram-like Settings Menu and Multi-Account Support">
  <action description="Refactor authStore.js to manage multiple logged-in accounts (sessions) in localStorage, allowing adding accounts, switching accounts, and logging out selectively.">
    - Read authStore.js and authUtils.js
    - Implement accounts state array in authStore.js
    - Add multi-account action handlers: switchAccount, addAccountSession, logoutCurrent, logoutAll
  </action>
  <verify description="Check that authStore compile errors do not exist and existing auth works.">
    - Build or verify frontend compilation.
  </verify>
  <done />

  <action description="Create Settings.jsx with all Instagram settings panels and multi-account buttons.">
    - Formulate 10+ categorized panels matching Instagram's configuration layout.
    - Build account management switching dialog and mini login dialog to Add Account.
  </action>
  <verify description="Ensure Settings.jsx renders all sections correctly without crash.">
    - Load routing structure.
  </verify>
  <done />

  <action description="Register /settings route and integrate settings triggers in shell layouts.">
    - Add path to App.jsx.
    - Modify Sidebar.jsx to include Settings link.
    - Update Profile.jsx settings button to redirect to /settings.
  </action>
  <verify description="Run django and client servers, verify routing.">
    - Confirm all pages resolve successfully.
  </verify>
  <done />
</task>
