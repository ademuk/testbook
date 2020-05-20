import React, {useEffect, useState} from 'react';
import {
  useParams,
  Route, Link,
} from "react-router-dom";
import queryString from "query-string";
import Typography from '@material-ui/core/Typography';
import Button from "@material-ui/core/Button";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import {makeStyles} from "@material-ui/core/styles";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Assertion from "./test/Assertion";
import Event from "./test/Event";
import Box from "@material-ui/core/Box";


const Step = ({step, result: {result}, expanded, onExpandChange}) => {
  const useStyles = makeStyles(theme => ({
    root: {
      width: '100%',
    },
    heading: {
      fontSize: theme.typography.pxToRem(15),
      flexBasis: '33.33%',
      flexShrink: 0,
    },
    secondaryHeading: {
      fontSize: theme.typography.pxToRem(15),
      color: theme.palette.text.secondary,
    },
  }));

  const classes = useStyles();

  const {type, ...rest} = step;

  return (
    <ExpansionPanel expanded={expanded} onChange={onExpandChange}>
      <ExpansionPanelSummary
        expandIcon={<ExpandMoreIcon />}
      >
        <Typography className={classes.heading}>
          {type}
        </Typography>
        <Typography className={classes.secondaryHeading}>
          {result}
        </Typography>
      </ExpansionPanelSummary>
      <ExpansionPanelDetails>
        <Typography>
          {JSON.stringify(rest, null, 2)}
        </Typography>
      </ExpansionPanelDetails>
    </ExpansionPanel>
  )
};

export default function Test({match: {url}, location: {search}, history}) {
  const {testId} = useParams();
  const [test, setTest] = useState({});
  const [steps, setSteps] = useState();
  const [stepResults, setStepResults] = useState([]);

  const {file, exportName} = queryString.parse(search);

  useEffect(() => {
    fetch(`/test/${testId}${search}`)
      .then(res => res.json())
      .then(test => {
        setTest(test);
        setSteps(test.steps);
      })
  }, [testId, file, exportName, search]);

  useEffect(() => {
    fetch(`/test/${testId}/run${search}`)
      .then(res => res.json())
      .then(setStepResults)
  }, [testId, file, exportName, steps, search]);

  const save = steps => {
    setSteps(
      steps
    );

    fetch(`/test/${test.id}/steps${search}`, {
      method: 'put',
      body: JSON.stringify(steps),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  const handleAdd = step =>
    save([...steps, step]);

  const [expanded, setExpanded] = React.useState(false);

  const handleExpandChange = panel => (event, isExpanded) =>
    setExpanded(isExpanded ? panel : false);

  return (
    <>
      <Typography variant="h5">
        Test {test.id}
      </Typography>
      <Typography variant="h6" gutterBottom>
        {file} / <Link to={`/tests/?file=${file}&exportName=${exportName}`}>{exportName}</Link>
      </Typography>

      <div>
        {!!steps && steps.map((step, i) =>
          <Step
            step={step}
            result={stepResults[i] || {}}
            expanded={expanded === i}
            onExpandChange={handleExpandChange(i)}
            key={i}
          />
        )}
      </div>
      <Box marginTop={2}>
        <ButtonGroup>
          <Button
            onClick={() => history.push(`${url}/event${search}`)}
            variant="contained"
            color="primary"
          >
            Event
          </Button>
          <Button
            onClick={() => history.push(`${url}/assertion${search}`)}
            variant="contained"
            color="primary"
          >
            Assertion
          </Button>
        </ButtonGroup>
      </Box>

      <Route path={`${url}/assertion`} render={({location}) => (
        <Assertion
          onAdd={handleAdd}
          onClose={() => history.push(`${url}${search}`)}
          location={location}
        />
      )} />

      <Route path={`${url}/event`} render={({location}) => (
        <Event
          onAdd={handleAdd}
          onClose={() => history.push(`${url}${search}`)}
          location={location}
        />
      )} />
    </>
  )
}
