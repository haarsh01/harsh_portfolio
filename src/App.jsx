import React from 'react'
import gsap from "gsap";
import {Dock, Navbar, Welcome} from "#components";
import { Draggable } from "gsap/Draggable";
import { Finder, Resume, Safari, Terminal } from '#windows';


gsap.registerPlugin(Draggable);

const App = () => {
  return (
   <main>
    <Navbar/>
    <Welcome/>
    <Dock/>
<Safari/>
    <Terminal/>
    <Resume/>
    <Finder/>

   </main>
  )
}

export default App
