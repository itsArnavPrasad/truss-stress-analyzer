import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
      </Switch>
      <Toaster />
    </>
  );
}

export default Router;
