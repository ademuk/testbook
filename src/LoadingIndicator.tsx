import * as React from "react";

const LoadingIndicator: React.FC = ({ children }) => (
  <div className="flex h-full">
    <div className="m-auto text-center">
      <div className="inline-block loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16" />
      <div className="mt-2 text-gray-700 font-medium">{children}</div>
    </div>
  </div>
);

export default LoadingIndicator;
