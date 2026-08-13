import './App.css'
import AuthLoading from './components/AuthLoading'
import AppHeader from './components/AppHeader'
import LoginModal from './components/LoginModal'
import ResultSection from './components/ResultSection'
import SajuForm from './components/SajuForm'
import Sidebar from './components/Sidebar'
import SignupModal from './components/SignupModal'
import useSajuApp from './hooks/useSajuApp'

function App() {
  const app = useSajuApp()

  if (!app.authReady || (app.user && !app.profileChecked)) {
    return <AuthLoading />
  }

  return (
    <div className={`page theme-${app.theme}`}>
      {app.showLoginModal && !app.user && (
        <LoginModal
          authError={app.authError}
          isAuthLoading={app.isAuthLoading}
          onLogin={app.handleGoogleLogin}
          onClose={() => app.setShowLoginModal(false)}
        />
      )}

      {app.showSignupModal && (
        <SignupModal
          isSignup={app.needsSignup}
          form={app.signupForm}
          error={app.signupError}
          isSaving={app.isSavingProfile}
          isAuthLoading={app.isAuthLoading}
          onChange={app.updateSignupForm}
          onSubmit={app.handleSignupSubmit}
          onLogout={app.handleLogout}
          onCancel={() => app.setShowSignupModal(false)}
        />
      )}

      {!app.needsSignup && (
        <div className={`layout${app.user ? '' : ' layout-guest'}`}>
          <Sidebar
            user={app.user}
            readings={app.readings}
            selectedId={app.selectedId}
            listError={app.listError}
            onResetForm={() => app.resetForm()}
            onSelectReading={app.handleSelectReading}
          />

          <div className="app">
            <AppHeader
              user={app.user}
              isAuthLoading={app.isAuthLoading}
              onOpenProfile={() => app.openSignupModal(app.profile || {})}
              onLogout={app.handleLogout}
              onOpenLogin={() => app.setShowLoginModal(true)}
            />

            {app.authError && <p className="sidebar-error">{app.authError}</p>}
            {app.profileMessage && <p className="profile-message">{app.profileMessage}</p>}

            <SajuForm
              form={app.form}
              onChange={app.updateForm}
              onSubmit={app.handleResultClick}
              onUpdate={app.handleUpdateReading}
              onDelete={app.handleDeleteReading}
              selectedId={app.selectedId}
              user={app.user}
              busy={app.busy}
              isLoading={app.isLoading}
              isSaving={app.isSaving}
              isDeleting={app.isDeleting}
            />

            <ResultSection
              isLoading={app.isLoading}
              selectedReading={app.selectedReading}
              form={app.form}
              result={app.result}
              previewResult={app.previewResult}
              isPreviewLocked={app.isPreviewLocked}
              shareMessage={app.shareMessage}
              onResultChange={app.setResult}
              onShare={app.handleShareResult}
              onUnlock={() => {
                app.persistCurrentResult()
                app.setShowLoginModal(true)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
