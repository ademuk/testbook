import React, {useState, useEffect} from 'react';
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItemLink from "./ListItemLink";


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
            key={f.file}
          >
            <div key={f.file}>
              {f.components.map(c =>
                <ListItemLink to={`/tests?file=${f.file}&exportName=${c.name}`} primary={c.name} key={c.name} />
              )}
            </div>
          </List>
        )
      )}
    </div>
  )
}
