import * as React from 'react';
import polyglotI18nProvider from 'ra-i18n-polyglot';
import {
    Admin,
    Resource,
    localStorageStore,
    useStore,
    StoreContextProvider,
} from 'react-admin';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';

import authProvider from './authProvider';
import dataProvider from './dataProvider';
import { Layout, Login } from './layout';
import englishMessages from './i18n/en';
import { themes, ThemeName } from './themes/themes';
import { UserList } from './resources/users/UserList';
import { UserShow } from './resources/users/UserShow';
import { ProductList } from './resources/products/ProductList';
import { CategoryList } from './resources/categories/CategoryList';
import { CategoryCreate } from './resources/categories/CategoryCreate';

const i18nProvider = polyglotI18nProvider(
    () => englishMessages,
    'en',
    [{ locale: 'en', name: 'English' }]
);

const store = localStorageStore(undefined, 'App');

const App = () => {
    const [themeName] = useStore<ThemeName>('themeName', 'soft');
    const singleTheme = themes.find(t => t.name === themeName)?.single;
    const lightTheme = themes.find(t => t.name === themeName)?.light;
    const darkTheme = themes.find(t => t.name === themeName)?.dark;

    return (
        <Admin
            dataProvider={dataProvider}
            store={store}
            authProvider={authProvider}
            loginPage={Login}
            layout={Layout}
            i18nProvider={i18nProvider}
            disableTelemetry
            theme={singleTheme}
            lightTheme={lightTheme}
            darkTheme={darkTheme}
            defaultTheme="light"
            requireAuth
        >
            <Resource
                name="users"
                list={UserList}
                show={UserShow}
                icon={PeopleIcon}
                options={{ label: 'Users' }}
            />
            <Resource
                name="products"
                list={ProductList}
                icon={InventoryIcon}
                options={{ label: 'Products' }}
            />
            <Resource
                name="categories"
                list={CategoryList}
                create={CategoryCreate}
                icon={CategoryIcon}
                options={{ label: 'Categories' }}
            />
        </Admin>
    );
};

const AppWrapper = () => (
    <StoreContextProvider value={store}>
        <App />
    </StoreContextProvider>
);

export default AppWrapper;