import React from "react";
import { Link as RouterLink } from "react-router-dom";

const stepClassNames: {[key: string]: string} = {
  success: "bg-green-400",
  error: "bg-red-400",
};

const getClassName = (selected: boolean, active: boolean): string => {
  if (active) {
    return "bg-gray-800 text-white";
  }

  if (selected) {
    return "bg-gray-600 hover:bg-gray-800 text-white";
  }

  return "text-gray-700 hover:text-gray-600 hover:bg-gray-100";
};

type StatusLinkProps = {
  link: string;
  selected?: boolean;
  active?: boolean;
  subTitle?: string;
  status?: string;
  onResultClick?: (e: React.MouseEvent<HTMLElement>) => void,
};

const StatusLink: React.FC<StatusLinkProps> = ({
  link,
  children,
  selected = false,
  active = false,
  subTitle = null,
  status = null,
  onResultClick = null
}) => (
  <RouterLink
    to={link}
    className={`flex rounded-lg p-2 px my-2 ${getClassName(selected, active)}`}
  >
    <span
      className={`${
        ((status && stepClassNames[status]) || "bg-gray-400")
      } h-2 w-2 m-2 rounded-full ${onResultClick && 'hover:bg-red-700'}`}
      onClick={onResultClick ? onResultClick : () => {}}
    />

    <div className="flex-grow font-medium px-2">{children}</div>
    {subTitle && (
      <div className="text-xs font-normal text-gray-500 tracking-wide">
        {subTitle}
      </div>
    )}
  </RouterLink>
);

export default StatusLink;
