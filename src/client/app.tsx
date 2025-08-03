import { render } from 'preact';
import Router from 'preact-router';
import { PasswordContextProvider } from '../password-context';
import { DashboardPage } from './components/DashboardPage';
import { IndexPage } from './components/IndexPage';
import { LoginPage } from './components/LoginPage';
import { SelftestPage } from './components/SelftestPage';
import { UserPage } from './components/UserPage';

function App() {
    return (
        <PasswordContextProvider>
            <Router>
                <IndexPage path="/" />
                <LoginPage path="/login" />
                <DashboardPage path="/dashboard" />
                <SelftestPage path="/selftest" />
                <UserPage default />
            </Router>
        </PasswordContextProvider>
    );
}

// @ts-ignore
render(<App />, document.getElementById('app'));
