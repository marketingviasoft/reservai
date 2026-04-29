import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Items from "./pages/Items";
import Categories from "./pages/Categories";
import Kits from "./pages/Kits";
import Team from "./pages/Team";
import Calendar from "./pages/Calendar";
import Reservations from "./pages/Reservations";
import CheckInOut from "./pages/CheckInOut";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/items" component={Items} />
        <Route path="/categories" component={Categories} />
        <Route path="/kits" component={Kits} />
        <Route path="/team" component={Team} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/reservations" component={Reservations} />
        <Route path="/checkinout" component={CheckInOut} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
