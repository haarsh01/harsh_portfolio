import { socials } from '#constants';
import WindowWarpper from '#hoc/WindowWarpper';
import { WindowControls } from "#components";
import React from 'react'

const Contact = () => {
  return (
    <>
    <div id="window-header">
        <WindowControls target="contact"/>

        <h2> Contact Me</h2>
    </div>
    <div className="p-5 space-y-5">
        <img
        
        src="/images/adrian.jpg" alt="harsh" className="w-20 rounded-full" />

        <h3>Lets Connect</h3>
        <p>Hasjd djdkdkdk djdkdk</p>
        <p>hr424144@dal.ca</p>

        <ul>

            {socials.map(({id, bg, link, icon, text})=> (
                <li key={id} style={{backgroundColor:bg}}>
                    <a href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={text}
                    >
                        <img src={icon} alt={text} className="size-5"/>
                        <p>{text}</p>
                    </a>
                </li>
            ))}
        </ul>

    </div>
    
    </>
  );
};
const ContactWindow= WindowWarpper(Contact, "contact");

export default ContactWindow;
