import React from 'react';
import {Link} from "react-router-dom";

const StatusLink = ({link, children, subText = null, status = null}) => {
  const stepClassName = status === 'success' ? 'bg-green-400' : 'bg-gray-400';
  return <Link to={link} className="flex justify-start cursor-pointer text-gray-700 hover:text-blue-400 hover:bg-blue-100 rounded-md px-2 py-2 my-2">
    {status && <span className={`${stepClassName} h-2 w-2 m-2 rounded-full`} />}
    <div className="flex-grow font-medium px-2">{children}</div>
    {subText && <div className="text-sm font-normal text-gray-500 tracking-wide">{subText}</div>}
  </Link>;
};

export default StatusLink;
