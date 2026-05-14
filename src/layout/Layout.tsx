import * as React from 'react';
import { Layout as RaLayout } from 'ra-ui-materialui';
import AppBar from './AppBar';
import Menu from './Menu';

const Layout = (props: any) => (
    <RaLayout
        {...props}
        appBar={AppBar}
        menu={Menu}
    />
);

export default Layout;