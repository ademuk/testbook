import React, {useEffect, useState} from "react";
import {
  useParams,
} from "react-router-dom";
import queryString from "query-string";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControlLabel from "@material-ui/core/FormControlLabel";


export default function Event({location: {search}, onAdd, onClose}) {
  const {testId} = useParams();
  const [regions, setRegions] = useState([]);
  const [eventType, setEventType] = useState('click');
  const [target, setTarget] = useState('');
  const {file, exportName} = queryString.parse(search);

  useEffect(() => {
    fetch(`/test/${testId}/render/regions?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(setRegions)
  }, [testId, file, exportName]);

  const handleAddClick = () => {
    onAdd({
      type: 'event',
      eventType,
      target
    });

    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby="form-dialog-title"
      fullWidth={true}
    >
      <DialogTitle id="form-dialog-title">Event</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset">
          <FormLabel component="legend">Target</FormLabel>
          <RadioGroup
            name="target"
            value={target}
            onChange={({target: {value}}) => setTarget(value)}
            aria-label="target"
          >
            {!!regions.length && regions.map(r =>
              <FormControlLabel
                value={r.name}
                label={r.name + (r.unique ? '' : ' (not unique)')}
                control={<Radio />}
                key={r.name}
              />
            )}
          </RadioGroup>
        </FormControl>

        <FormControl component="fieldset">
          <FormLabel component="legend">Event Type</FormLabel>
          <RadioGroup
            name="eventType"
            value={eventType}
            onChange={({target: {value}}) => setEventType(value)}
            aria-label="eventType"
          >
            <FormControlLabel value="click" control={<Radio />} label="Click" />
            <FormControlLabel value="doubleclick" control={<Radio />} label="Double Click" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleAddClick} color="primary">
          Add
        </Button>
      </DialogActions>
    </Dialog>
  )
}
