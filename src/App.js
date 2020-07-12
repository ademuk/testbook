import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import Nav from "./Nav";
import Components from "./Components";
import Tests from "./Tests";
import Test from "./Test";
import './App.css';


const App = () =>
  <Router>
    <div className="md:flex flex-col md:flex-row md:min-h-screen w-full">
      <Nav />
      <div className="w-4/5 p-3 bg-gray-100">
        <Switch>
          <Route path="/tests/:testId" component={Test} />
          <Route path="/tests" component={Tests} />
          <Route path="/" component={Components} />
        </Switch>
      </div>
    </div>
  </Router>;

export default App;
