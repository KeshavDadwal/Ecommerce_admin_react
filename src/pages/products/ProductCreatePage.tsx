import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const GET_CATEGORIES = gql`
  query GetCategories {
    categories(pagination: { first: 200 }) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
    }
  }
`;

const CREATE_VARIANT = gql`
  mutation CreateVariant($input: CreateVariantInput!) {
    createVariant(input: $input) {
      id
    }
  }
`;

interface Variant {
  sku: string;
  name: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  weightGrams: string;
  options: string;
  isActive: boolean;
}

const emptyVariant = (): Variant => ({
  sku: "",
  name: "",
  price: "0", // ← was '' which caused variants to be filtered out silently
  compareAtPrice: "",
  costPrice: "",
  weightGrams: "0",
  options: "",
  isActive: true,
});

export const ProductCreatePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    brand: "",
    tags: "",
    status: "active",
    categoryIds: [] as string[],
    attributes: "",
  });
  const [variants, setVariants] = useState<Variant[]>([emptyVariant()]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  const categories =
    (categoriesData as any)?.categories?.edges?.map((e: any) => e.node) ?? [];
  const [createProduct, { loading }] = useMutation(CREATE_PRODUCT);
  const [createVariant] = useMutation(CREATE_VARIANT);

  const toSlug = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleChange =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        [field]: value,
        ...(field === "name" && prev.slug === toSlug(prev.name)
          ? { slug: toSlug(value) }
          : {}),
      }));
    };

  const handleVariantChange =
    (index: number, field: keyof Variant) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVariants((prev) =>
        prev.map((v, i) =>
          i === index
            ? {
                ...v,
                [field]:
                  field === "isActive" ? e.target.checked : e.target.value,
              }
            : v,
        ),
      );
    };

  // Validate a variant has the minimum required fields
  const isVariantValid = (v: Variant) =>
    v.sku.trim() !== "" && v.name.trim() !== "";

  const validVariants = variants.filter(isVariantValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.name || !form.slug || form.categoryIds.length === 0) {
      setSubmitError("Name, slug and category are required.");
      return;
    }

    if (variants.length > 0 && validVariants.length === 0) {
      setSubmitError(
        "Please fill in SKU and Variant Name for at least one variant.",
      );
      return;
    }

    // Build payload — only send fields that the backend handles correctly.
    // Extra fields (attributes, options, compareAtPrice, costPrice) were found to cause
    // variants to be silently dropped. Add them back once the backend is fixed.
    const mutationInput: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || " ",
      categoryIds: form.categoryIds,
    };

    // Optional fields — add only if filled in, and only safe ones
    if (form.shortDescription.trim())
      mutationInput.shortDescription = form.shortDescription.trim();
    if (form.status) mutationInput.status = form.status;
    if (form.brand.trim()) mutationInput.brand = form.brand.trim();
    if (form.tags.trim()) {
      mutationInput.tags = form.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
    }
    // attributes omitted for now — JSON string causes backend to silently drop variants
    // if (form.attributes.trim()) mutationInput.attributes = form.attributes.trim();

    console.log("📦 Sending payload:", JSON.stringify(mutationInput, null, 2));

    try {
      // 1. Create product FIRST (without variants)
      const productInput: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || " ",
        categoryIds: form.categoryIds,
      };

      if (form.shortDescription.trim()) {
        productInput.shortDescription = form.shortDescription.trim();
      }

      if (form.status) {
        productInput.status = form.status;
      }

      if (form.brand.trim()) {
        productInput.brand = form.brand.trim();
      }

      if (form.tags.trim()) {
        productInput.tags = form.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      }

      console.log("📦 Creating product:", productInput);

      const result = await createProduct({
        variables: {
          input: productInput,
        },
      });

      const productId = (result.data as any)?.createProduct?.id;

      if (!productId) {
        throw new Error("Product created but no product ID returned.");
      }

      console.log("✅ Product created:", productId);

      // 2. Create variants separately
      for (const variant of validVariants) {
        const variantInput = {
          productId,
          sku: variant.sku.trim(),
          name: variant.name.trim(),
          price: parseFloat(variant.price) || 0,
          weightGrams: parseInt(variant.weightGrams) || 0,
          isActive: variant.isActive,
        };

        console.log("📦 Creating variant:", variantInput);

        await createVariant({
          variables: {
            input: variantInput,
          },
        });
      }

      navigate("/products");
    } catch (err: any) {
      const message =
        err?.graphQLErrors?.[0]?.message ??
        err?.networkError?.result?.errors?.[0]?.message ??
        err?.message ??
        "Failed to create product. Please try again.";

      setSubmitError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/products")}
          className="gap-2 text-gray-600 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Button>
        <div className="h-4 w-px bg-gray-200" />
        <h1 className="text-lg font-semibold text-gray-900">Create Product</h1>
        <div className="ml-auto flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            Cancel
          </Button>
          <Button
            form="product-form"
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? "Creating…" : "Create Product"}
          </Button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="px-8 py-6 grid grid-cols-3 gap-6">
          {/* Left col — main info */}
          <div className="col-span-2 space-y-6">
            {/* Error banner */}
            {submitError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={handleChange("name")}
                    placeholder="Product name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.slug}
                    onChange={handleChange("slug")}
                    placeholder="product-slug"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Short Description
                </label>
                <Input
                  value={form.shortDescription}
                  onChange={handleChange("shortDescription")}
                  placeholder="Brief one-line summary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={handleChange("description")}
                  rows={4}
                  placeholder="Full product description"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Variants */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">Variants</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {validVariants.length}/{variants.length} variant
                    {variants.length !== 1 ? "s" : ""} ready to save
                    {variants.length > validVariants.length && (
                      <span className="text-amber-500 ml-1">
                        — fill in SKU &amp; Name to include remaining
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariants((p) => [...p, emptyVariant()])}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Variant
                </Button>
              </div>

              {variants.map((variant, index) => {
                const ready = isVariantValid(variant);
                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 space-y-3 ${
                      ready
                        ? "border-gray-100 bg-gray-50/50"
                        : "border-amber-200 bg-amber-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-white">
                          Variant {index + 1}
                        </Badge>
                        {!ready && (
                          <span className="text-xs text-amber-600">
                            SKU &amp; Name required
                          </span>
                        )}
                      </div>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setVariants((p) => p.filter((_, i) => i !== index))
                          }
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          SKU <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={variant.sku}
                          onChange={handleVariantChange(index, "sku")}
                          placeholder="SKU-001"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          Variant Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={variant.name}
                          onChange={handleVariantChange(index, "name")}
                          placeholder="Default / XL / Red"
                          className="bg-white"
                        />
                      </div>
                      {/* Options field hidden — backend bug causes silent variant drop when options is sent */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={variant.price}
                          onChange={handleVariantChange(index, "price")}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          Compare At Price
                        </label>
                        <Input
                          type="number"
                          value={variant.compareAtPrice}
                          onChange={handleVariantChange(
                            index,
                            "compareAtPrice",
                          )}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          Cost Price
                        </label>
                        <Input
                          type="number"
                          value={variant.costPrice}
                          onChange={handleVariantChange(index, "costPrice")}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          Weight (grams) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={variant.weightGrams}
                          onChange={handleVariantChange(index, "weightGrams")}
                          placeholder="0"
                          min="0"
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={variant.isActive}
                        onChange={handleVariantChange(index, "isActive")}
                        className="rounded"
                      />
                      Active
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right col — meta */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800">Product Details</h2>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  multiple
                  value={form.categoryIds}
                  onChange={(e) => {
                    const values = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    );

                    setForm((prev) => ({
                      ...prev,
                      categoryIds: values,
                    }));
                  }}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={handleChange("status")}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Brand
                </label>
                <Input
                  value={form.brand}
                  onChange={handleChange("brand")}
                  placeholder="Brand name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Tags
                </label>
                <Input
                  value={form.tags}
                  onChange={handleChange("tags")}
                  placeholder="sale, new (comma separated)"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Attributes
                </label>
                <Input
                  value={form.attributes}
                  onChange={handleChange("attributes")}
                  placeholder='{"color":"midnight"}'
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
