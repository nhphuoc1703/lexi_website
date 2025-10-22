// import logo from './logo.svg';
// "importing" from logo from src folder
// ====== App.js is the main renderer - rendering pages and components ======
// importing the components
import logo from './lexi_logo.png';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// importing the pages
import { Sign_in } from './Pages/sign_in.js';
import { Loading } from './Pages/loading.js';

function App() {
  return (
    // <div className="App">
    //   <header className="App-header">
    //     <img src={logo} className="App-logo" alt="logo" />
    //     <p>
    //       {/* Edit <code>src/App.js</code> and save to reload. */}
    //       Loading...
    //     </p>
    //     {/* <a
    //       className="App-link"
    //       href="https://reactjs.org"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       Learn React
    //     </a> */}
    //   </header>
    // </div>
    <Router>
      <Routes>
        <Route path="/" element={<Loading />} />
        <Route path="/sign_in" element={<Sign_in />} />
      </Routes>
    </Router>
  );
}

export default App;
