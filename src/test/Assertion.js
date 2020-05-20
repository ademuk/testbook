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
import TextField from "@material-ui/core/TextField";
import FormLabel from "@material-ui/core/FormLabel";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import FormControl from "@material-ui/core/FormControl";


export default function Assertion({location: {search}, onAdd, onClose}) {
  const {testId} = useParams();
  const [target, setTarget] = useState('');
  const [regions, setRegions] = useState([]);
  const [assertionType, setAssertionType] = useState('elementIsPresent');
  const {file, exportName} = queryString.parse(search);

  useEffect(() => {
    fetch(`/test/${testId}/render/regions?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(setRegions)
  }, [testId, file, exportName]);

  const handleAddClick = () => {
    onAdd({
      type: 'assertion',
      assertionType,
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
      <DialogTitle id="form-dialog-title">Assertion</DialogTitle>
      <DialogContent>

        <FormControl component="fieldset">
          <FormLabel component="legend">Assertion Type</FormLabel>
          <RadioGroup
            name="eventType"
            value={assertionType}
            onChange={({target: {value}}) => setAssertionType(value)}
            aria-label="eventType"
          >
            <FormControlLabel
              value="elementIsPresent"
              label="Element is Present"
              control={<Radio />}
            />
            <FormControlLabel
              value="textIsPresent"
              label="Text is present"
              control={<Radio />}
            />
          </RadioGroup>
        </FormControl>

        {assertionType === 'elementIsPresent' && <FormControl component="fieldset">
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
        </FormControl>}

        {assertionType === 'textIsPresent' && <TextField
          label="Text"
          variant="outlined"
          margin="dense"
          onChange={({target: {value}}) => setTarget(value)}
          value={target}
          fullWidth
          autoFocus
        />}
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
