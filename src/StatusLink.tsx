import React from "react";
import { Link as RouterLink } from "react-router-dom";

const stepClassNames: { [key: string]: string } = {
  success: "bg-green-400",
  error: "bg-red-400",
};

const getClassName = (selected: boolean, active: boolean): string => {
  if (active) {
    return "bg-gray-800 text-white shadow-md";
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
  subtitle?: string;
  status?: string;
  onResultClick?: (e: React.MouseEvent<HTMLElement>) => void;
};

const StatusLink: React.FC<StatusLinkProps> = ({
  link,
  children,
  selected = false,
  active = false,
  subtitle = null,
  status = null,
  onResultClick = null,
}) => (
  <RouterLink
    to={link}
    className={`flex items-center rounded-3xl p-2 my-2 ${getClassName(
      selected,
      active
    )}`}
  >
    <span
      className={`${
        (status && stepClassNames[status]) || "bg-gray-400"
      } h-2 w-2 m-2 rounded-full flex-shrink-0 ${
        onResultClick && "hover:bg-red-700"
      }`}
      onClick={onResultClick ? onResultClick : () => {}}
    />

    <div className="flex-grow font-medium px-2">{children}</div>

    {subtitle && (
      <div className="text-xs font-normal text-gray-500 tracking-wide mr-2">
        {subtitle}
      </div>
    )}
  </RouterLink>
);

export default StatusLink;
