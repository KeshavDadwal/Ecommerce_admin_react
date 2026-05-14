import * as React from 'react';
import { Menu as RaMenu } from 'ra-ui-materialui';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';

const Menu = () => (
    <RaMenu>
        <RaMenu.Item to="/users" primaryText="Users" leftIcon={<PeopleIcon />} />
        <RaMenu.Item to="/products" primaryText="Products" leftIcon={<InventoryIcon />} />
        <RaMenu.Item to="/categories" primaryText="Categories" leftIcon={<CategoryIcon />} />
    </RaMenu>
);

export default Menu;