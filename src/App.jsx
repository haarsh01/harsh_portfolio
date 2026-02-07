import React from 'react'
import gsap from "gsap";
import {Dock, Navbar, Welcome, Home} from "#components";
import { Draggable } from "gsap/Draggable";
import { Finder, Resume, Safari, Terminal, Text, Image, Contact } from '#windows';


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
    <Text/>
    <Image/>
    <Contact/>
    <Home/>

   </main>
  )
}

export default App
