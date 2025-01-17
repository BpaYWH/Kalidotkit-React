import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import ConfigMenu from "./components/ConfigMenu";
import VRMPlatform from "./components/VRMPlatform";
import SampleDemo from "./components/Tester"
import AppProvider from "./context/AppContext";
import "./App.css";

function App(): JSX.Element {
   return (
      <AppProvider>
         <Router>
            <Routes>
               <Route path="/" element={<ConfigMenu />} />
               <Route path="/platform" element={<VRMPlatform />} />
               <Route path="/sample" element={<SampleDemo />} />
            </Routes>
         </Router>
      </AppProvider>
   );
}

export default App;
