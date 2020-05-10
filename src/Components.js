import React, {useState, useEffect} from 'react';
import {
  Link
} from "react-router-dom";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";

export default function Components() {
  const [files, setFiles] = useState();

  useEffect(() => {
    fetch('/component')
      .then(res => res.json())
      .then(setFiles)
  }, []);

  return (
    <div>
      <Typography variant="h5">
        Components
      </Typography>

      {!!files && files.map(
        f => (
          <List
            component="nav"
            aria-labelledby="nested-list-subheader"
            subheader={
              <ListSubheader component="div" id="nested-list-subheader">
                {f.file}
              </ListSubheader>
            }
          >
            <div key={f.file}>
              {f.components.map(c => (
                <ListItem
                  component={props => <Link to={`/tests?file=${f.file}&exportName=${c.name}`} {...props} />}
                  button
                  key={f.file}
                >
                  <ListItemText primary={c.name} />
                </ListItem>
              ))}
            </div>
          </List>
        )
      )}
    </div>
  )
}
