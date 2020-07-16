import React from 'react';
import {Link} from "react-router-dom";

const stepClassNames = {
  success: 'bg-green-400',
  error: 'bg-red-400',
};

const StatusLink = ({link, children, subTitle = null, status = null, className = null}) => {
  return (
    <Link to={link}
          className={`flex justify-start cursor-pointer text-gray-700 hover:text-gray-600 hover:bg-gray-100 rounded-md p-2 my-2 ${className}`}>
      <span className={`${stepClassNames[status] || 'bg-gray-400'} h-2 w-2 m-2 rounded-full`} />
      <div className="flex-grow font-medium px-2">{children}</div>
      {subTitle && <div className="text-sm font-normal text-gray-500 tracking-wide">{subTitle}</div>}
    </Link>
  );
};

export default StatusLink;
