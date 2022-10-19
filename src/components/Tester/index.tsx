import { SelectChangeEvent, Typography } from "@mui/material";
import { Select, MenuItem } from "@mui/material";
import Button from "@mui/material/Button";
import { Link } from "react-router-dom";
import {useRef} from 'react';

function SampleDemo(): JSX.Element {


      const inputRef = useRef(null);
    
      const handleClick = () => {
        // 👇️ open file input box on click of other element
        inputRef.current.click();
      };
    
      const handleFileChange = event => {
        const fileObj = event.target.files && event.target.files[0];
        if (!fileObj) {
          return;
        }
    
        console.log('fileObj is', fileObj);
    
        // 👇️ reset file input
        event.target.value = null;
    
        // 👇️ is now empty
        console.log(event.target.files);
    
        // 👇️ can still access file object here
        console.log(fileObj);
        console.log(fileObj.name);
      };
    
      return (
        <div>
          <input
            style={{display: 'none'}}
            ref={inputRef}
            type="file"
            onChange={handleFileChange}
          />
    
          <button  
            color={"primary"}
            onClick={handleClick}>Open file upload box
          </button>
        </div>
      );
    };
    

export default SampleDemo;
