import React, {forwardRef, useMemo} from "react";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import {Link} from "react-router-dom";


export default function ListItemLink(props) {
  const { primary, to } = props;

  const renderLink = useMemo(
    () =>
      forwardRef((linkProps, ref) => (
        <Link ref={ref} to={to} {...linkProps} />
      )),
    [to],
  );

  return (
    <ListItem button component={renderLink}>
      <ListItemText primary={primary} />
    </ListItem>
  );
}
