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
import styles from  './App.module.css';


const App = () =>
  <Router>
    <div className={`md:flex flex-col md:flex-row md:min-h-screen w-full h-screen bg-gray-100 ${styles.bg}`}>
      <Nav />
      <div className="md:w-5/6 overflow-auto">
        <Switch>
          <Route path="/tests/:testId" component={Test} />
          <Route path="/tests" component={Tests} />
          <Route path="/" component={Components} />
        </Switch>
      </div>
    </div>
  </Router>;

export default App;
