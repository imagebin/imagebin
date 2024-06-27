import { createContext } from 'react';

const MainContext = createContext({
    current_image: 0,
    zoom: 1,
    width: 0,
    height: 0,
    left: 0,
    top: 0,
});

export default MainContext;