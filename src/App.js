import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import './App.css';
import Typography from "@material-ui/core/Typography";
import CssBaseline from "@material-ui/core/CssBaseline";
import Components from "./Components";
import Tests from "./Tests";
import Test from "./Test";
import Container from "@material-ui/core/Container";


const App = () =>
  <Router>
    <CssBaseline />
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Testbook
      </Typography>
      <Switch>
        <Route path="/tests/:testId" component={Test} />
        <Route path="/tests" component={Tests} />
        <Route path="/" component={Components} />
      </Switch>
    </Container>
  </Router>;

export default App;
