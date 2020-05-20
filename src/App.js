import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

import Typography from "@material-ui/core/Typography";
import CssBaseline from "@material-ui/core/CssBaseline";
import Container from "@material-ui/core/Container";
import Components from "./Components";
import Tests from "./Tests";
import Test from "./Test";
import './App.css';


const App = () =>
  <Router>
    <CssBaseline />
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        <Link to={'/'}>Testbook</Link>
      </Typography>
      <Switch>
        <Route path="/tests/:testId" component={Test} />
        <Route path="/tests" component={Tests} />
        <Route path="/" component={Components} />
      </Switch>
    </Container>
  </Router>;

export default App;
