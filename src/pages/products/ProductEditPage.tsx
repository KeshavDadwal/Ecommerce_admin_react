import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      description
      categories {
        id
        name
      }
      variants {
        id
        sku
        name
        price
        weightGrams
        isActive
      }
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      name
    }
  }
`;

const CREATE_VARIANT = gql`
  mutation CreateVariant($input: CreateVariantInput!) {
    createVariant(input: $input) {
      id
      sku
      name
      price
      weightGrams
      isActive
    }
  }
`;

const UPDATE_VARIANT = gql`
  mutation UpdateVariant($id: ID!, $input: UpdateVariantInput!) {
    updateVariant(id: $id, input: $input) {
      id
      sku
      name
      price
      weightGrams
      isActive
    }
  }
`;

const DELETE_VARIANT = gql`
  mutation DeleteVariant($id: ID!) {
    deleteVariant(id: $id)
  }
`;

interface Variant {
  id?: string;
  sku: string;
  name: string;
  price: string;
  weightGrams: string;
  isActive: boolean;
  isNew?: boolean;
}

const emptyVariant = (): Variant => ({
  sku: "",
  name: "",
  price: "0",
  weightGrams: "0",
  isActive: true,
  isNew: true,
});

const isVariantValid = (v: Variant) =>
  v.sku.trim() !== "" && v.name.trim() !== "";

const toSlug = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const ProductEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryIds: [] as string[],
  });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const {
    data: productData,
    loading: productLoading,
    error: productError,
  } = useQuery(GET_PRODUCT, {
    variables: { id },
    skip: !id,
  });
  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  const categories =
    (categoriesData as any)?.categories?.edges?.map((e: any) => e.node) ?? [];

  const [updateProduct] = useMutation(UPDATE_PRODUCT);
  const [createVariant] = useMutation(CREATE_VARIANT);
  const [updateVariant] = useMutation(UPDATE_VARIANT);
  const [deleteVariant] = useMutation(DELETE_VARIANT);

  useEffect(() => {
    const p = (productData as any)?.product;
    if (!p) return;
    setForm({
      name: p.name ?? "",
      description: p.description ?? "",
      categoryIds: (p.categories ?? []).map((c: any) => c.id),
    });
    setVariants(
      (p.variants ?? []).map((v: any) => ({
        id: v.id,
        sku: v.sku ?? "",
        name: v.name ?? "",
        price: String(v.price ?? "0"),
        weightGrams: String(v.weightGrams ?? "0"),
        isActive: v.isActive ?? true,
        isNew: false,
      })),
    );
  }, [productData]);

  const handleChange =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
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
                  field === "isActive"
                    ? (e.target as HTMLInputElement).checked
                    : e.target.value,
              }
            : v,
        ),
      );
    };

  const removeVariant = (index: number) => {
    const v = variants[index];
    if (v.id) setDeletedVariantIds((prev) => [...prev, v.id!]);
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const validVariants = variants.filter(isVariantValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSaving(true);

    if (!form.name || form.categoryIds.length === 0) {
      setSubmitError("Name and category are required.");
      setSaving(false);
      return;
    }

    try {
      // 1. Delete removed variants FIRST to avoid duplicate SKU conflicts
      for (const vid of deletedVariantIds) {
        await deleteVariant({ variables: { id: vid } });
      }

      // 2. Update product basic info only (no variants field)
      await updateProduct({
        variables: {
          id,
          input: {
            name: form.name.trim(),
            slug: toSlug(form.name.trim()),
            description: form.description.trim() || " ",
            categoryIds: form.categoryIds,
          },
        },
      });

      // 3. Update existing / create new variants sequentially
      for (const v of validVariants) {
        const variantInput = {
          productId: id,
          sku: v.sku.trim(),
          name: v.name.trim(),
          price: parseFloat(v.price) || 0,
          weightGrams: parseInt(v.weightGrams) || 0,
          isActive: v.isActive,
        };

        if (v.id) {
          await updateVariant({ variables: { id: v.id, input: variantInput } });
        } else {
          await createVariant({
            variables: { input: { ...variantInput, productId: id } },
          });
        }
      }

      navigate("/products");
    } catch (err: any) {
      const message =
        err?.graphQLErrors?.[0]?.message ??
        err?.networkError?.result?.errors?.[0]?.message ??
        err?.message ??
        "Failed to save product. Please try again.";
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  };

  if (productLoading)
    return (
      <div className="p-8 space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  if (productError)
    return (
      <div className="p-8">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-lg">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Failed to load product
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {productError.message}
            </p>
          </div>
        </div>
      </div>
    );

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
        <h1 className="text-lg font-semibold text-gray-900">Edit Product</h1>
        <div className="ml-auto flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            Cancel
          </Button>
          <Button
            form="edit-form"
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <form id="edit-form" onSubmit={handleSubmit}>
        <div className="px-8 py-6 grid grid-cols-3 gap-6">
          {/* Left — main content */}
          <div className="col-span-2 space-y-6">
            {submitError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800">Basic Information</h2>
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
                    {deletedVariantIds.length > 0 && (
                      <span className="text-red-400 ml-1">
                        · {deletedVariantIds.length} will be deleted
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

              {variants.length === 0 && (
                <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  No variants. Add one above.
                </div>
              )}

              {variants.map((variant, index) => {
                const ready = isVariantValid(variant);
                return (
                  <div
                    key={variant.id ?? index}
                    className={`border rounded-lg p-4 space-y-3 ${
                      variant.isNew
                        ? "border-indigo-200 bg-indigo-50/30"
                        : ready
                        ? "border-gray-100 bg-gray-50/50"
                        : "border-amber-200 bg-amber-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-white">
                          {variant.isNew ? "New" : `Variant ${index + 1}`}
                        </Badge>
                        {!variant.isActive && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-gray-100 text-gray-500"
                          >
                            Inactive
                          </Badge>
                        )}
                        {!ready && (
                          <span className="text-xs text-amber-600">
                            SKU &amp; Name required
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          Price
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
                          Weight (grams)
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

          {/* Right — meta */}
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
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
