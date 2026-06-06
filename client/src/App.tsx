import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import IDELayout from "./components/IDELayout";
import JobsPage from "./pages/JobsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import ProfilePage from "./pages/ProfilePage";
import MemoryPage from "./pages/MemoryPage";
import LandingPage from "./pages/LandingPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/jobs" component={() => <IDELayout><JobsPage /></IDELayout>} />
      <Route path="/applications" component={() => <IDELayout><ApplicationsPage /></IDELayout>} />
      <Route path="/profile" component={() => <IDELayout><ProfilePage /></IDELayout>} />
      <Route path="/memory" component={() => <IDELayout><MemoryPage /></IDELayout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.16 0.008 264)",
                border: "1px solid oklch(0.22 0.008 264)",
                color: "oklch(0.88 0.01 264)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
