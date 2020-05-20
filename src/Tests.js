import React, {useEffect, useState} from 'react';
import {
  Link
} from "react-router-dom";
import queryString from "query-string";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";


const handleSave = (file, exportName, cb) =>
  fetch(`/test?file=${file}&exportName=${exportName}`, {
      method: 'post',
    })
    .then(r => r.json())
    .then(cb);

export default function Tests({history, location: {search}}) {
  const [tests, setTests] = useState([]);
  const {file, exportName} = queryString.parse(search);

  useEffect(() => {
    fetch(`/test?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(setTests)
  }, [file, exportName]);

  return (
    <div>
      <Typography variant="h5">
        Tests
      </Typography>
      <Typography variant="h6" gutterBottom>
       {file} / {exportName}
      </Typography>


      <List component="nav" aria-label="main mailbox folders">
        {!!tests && tests.map(
          t => (
            <ListItem
              component={props => <Link to={`/tests/${t.id}?file=${file}&exportName=${exportName}`} {...props} />}
              button
              key={t.id}
            >
              <ListItemText primary={t.id} />
            </ListItem>
          )
        )}
        {
          !tests.length && <div>
            No tests yet
          </div>
        }
      </List>

      <Button
        onClick={
          () => handleSave(
            file,
            exportName,
            ({id}) => history.push(`/tests/${id}?file=${file}&exportName=${exportName}`)
          )
        }
        variant="contained"
        color="primary"
      >
        New Test
      </Button>
    </div>
  )
 }
