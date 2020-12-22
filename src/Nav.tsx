import { Link } from "react-router-dom";

const Nav = () => (
  <nav className="flex flex-col w-full md:w-1/6 text-gray-700 bg-white dark-mode:text-gray-200 dark-mode:bg-gray-800 flex-shrink-0 bg-gray-800 p-3">
    <div className="flex-shrink-0 flex flex-row justify-between md:justify-center text-white">
      <div className="flex items-center flex-shrink-0 mr-6">
        <svg
          className="fill-current h-8 w-8 mr-2"
          width="54"
          height="54"
          viewBox="0 0 20 20"
        >
          <path d="M12.361,6.852H7.639C5.9,6.852,4.491,8.262,4.491,10s1.409,3.148,3.148,3.148h4.723c1.738,0,3.148-1.41,3.148-3.148S14.1,6.852,12.361,6.852z M12.361,12.361H7.639c-1.304,0-2.361-1.058-2.361-2.361s1.057-2.36,2.361-2.36h4.723c1.304,0,2.36,1.057,2.36,2.36S13.665,12.361,12.361,12.361z M10,0.949c-4.999,0-9.051,4.053-9.051,9.051S5.001,19.051,10,19.051c4.999,0,9.051-4.053,9.051-9.051S14.999,0.949,10,0.949z M10,18.264c-4.564,0-8.264-3.699-8.264-8.264S5.436,1.736,10,1.736c4.564,0,8.264,3.699,8.264,8.264S14.564,18.264,10,18.264z M7.639,8.819c-0.652,0-1.18,0.528-1.18,1.181s0.528,1.181,1.18,1.181c0.652,0,1.181-0.528,1.181-1.181S8.291,8.819,7.639,8.819z" />
        </svg>
        <Link
          to={"/"}
          className="font-semibold text-xl tracking-tight hover:underline"
        >
          Testbook
        </Link>
      </div>
      <button className="rounded-lg md:hidden rounded-lg focus:outline-none focus:shadow-outline">
        <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 15a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z"
          />
        </svg>
      </button>
    </div>
  </nav>
);

export default Nav;
