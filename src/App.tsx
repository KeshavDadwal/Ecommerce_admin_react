import { Refine } from "@refinedev/core";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import routerProvider from "@refinedev/react-router";
import { authProvider } from "./providers/authProvider";
import { dataProvider } from "./providers/dataProvider";
import { MainLayout } from "./components/layout/MainLayout";
import { LoginPage } from "./pages/login/LoginPage";
import { UsersPage } from "./pages/users/UsersPage";
import { UserShowPage } from "./pages/users/UserShowPage";
import { ProductsPage } from "./pages/products/ProductsPage";
import { ProductCreatePage } from "./pages/products/ProductCreatePage";
import { ProductEditPage } from "./pages/products/ProductEditPage";
import { CategoriesPage } from "./pages/categories/CategoriesPage";
import { CategoryCreatePage } from "./pages/categories/CategoryCreatePage";
import { CategoryEditPage } from "./pages/categories/CategoryEditPage";
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { BrandsPage } from "./pages/brands/BrandsPage";
import { BrandCreatePage } from "./pages/brands/BrandCreatePage";
import { BrandEditPage } from "./pages/brands/BrandEditPage";

const App = () => {
  return (
    <BrowserRouter>
      <Refine
        authProvider={authProvider}
        dataProvider={dataProvider}
        routerProvider={routerProvider}
        resources={[
          { name: "users", list: "/users", show: "/users/:id" },
          {
            name: "products",
            list: "/products",
            create: "/products/create",
            edit: "/products/:id/edit",
          },
          {
            name: "categories",
            list: "/categories",
            create: "/categories/create",
          },
          { name: "inventory", list: "/inventory" },
          {
            name: "brands",
            list: "/brands",
            create: "/brands/create",
            edit: "/brands/:id/edit",
          },
        ]}
        options={{ disableTelemetry: true }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<MainLayout />}>
            <Route
              path="/"
              element={
                <div className="p-8 text-2xl font-bold text-gray-800">
                  Welcome to EcomAdmin
                </div>
              }
            />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserShowPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/create" element={<ProductCreatePage />} />
            <Route path="/products/:id/edit" element={<ProductEditPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/create" element={<CategoryCreatePage />} />
            <Route
              path="/categories/:id/edit"
              element={<CategoryEditPage />}
            />{" "}
            {/* ← add this */}
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/brands/create" element={<BrandCreatePage />} />
            <Route path="/brands/:id/edit" element={<BrandEditPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </Refine>
    </BrowserRouter>
  );
};

export default App;
