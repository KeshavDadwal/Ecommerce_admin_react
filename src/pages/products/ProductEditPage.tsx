import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, AlertCircle, ImagePlus, X } from "lucide-react";
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

// ── images added to the variant fragment ────────────────────────────────────
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
        images {
          id
          url
        }
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

// ── Types ────────────────────────────────────────────────────────────────────
interface ExistingImage {
  id: string;
  url: string;
}

interface Variant {
  id?: string;
  sku: string;
  name: string;
  price: string;
  weightGrams: string;
  isActive: boolean;
  isNew?: boolean;
  /** Images already saved on the server */
  existingImages: ExistingImage[];
  /** New images selected by the user (not yet uploaded) */
  newImages: File[];
}

const emptyVariant = (): Variant => ({
  sku: "",
  name: "",
  price: "0",
  weightGrams: "0",
  isActive: true,
  isNew: true,
  existingImages: [],
  newImages: [],
});

const isVariantValid = (v: Variant) =>
  v.sku.trim() !== "" && v.name.trim() !== "";

const toSlug = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ── Variant Image Upload Strip ───────────────────────────────────────────────
interface VariantImageUploadProps {
  existingImages: ExistingImage[];
  newImages: File[];
  onRemoveExisting: (id: string) => void;
  onNewImagesChange: (files: File[]) => void;
}

const VariantImageUpload = ({
  existingImages,
  newImages,
  onRemoveExisting,
  onNewImagesChange,
}: VariantImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    onNewImagesChange([...newImages, ...accepted]);
  };

  const removeNewImage = (index: number) => {
    onNewImagesChange(newImages.filter((_, i) => i !== index));
  };

  const totalCount = existingImages.length + newImages.length;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">
        Images
        {totalCount > 0 && (
          <span className="ml-1.5 text-gray-400 font-normal">
            ({totalCount})
          </span>
        )}
      </label>

      <div className="flex flex-wrap gap-2 items-start">
        {/* Existing server images */}
        {existingImages.map((img) => (
          <div
            key={img.id}
            className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 group flex-shrink-0"
          >
            <img
              src={img.url}
              alt="variant"
              className="w-full h-full object-cover"
            />
            {/* Subtle "saved" indicator */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/30 text-white text-[8px] text-center leading-tight py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              saved
            </div>
            <button
              type="button"
              onClick={() => onRemoveExisting(img.id)}
              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Newly selected (not yet saved) images */}
        {newImages.map((file, i) => {
          const url = URL.createObjectURL(file);
          return (
            <div
              key={`new-${i}`}
              className="relative w-16 h-16 rounded-md overflow-hidden border border-indigo-300 group flex-shrink-0"
            >
              <img
                src={url}
                alt={file.name}
                className="w-full h-full object-cover"
                onLoad={() => URL.revokeObjectURL(url)}
              />
              {/* "new" badge */}
              <div className="absolute bottom-0 left-0 right-0 bg-indigo-500/70 text-white text-[8px] text-center leading-tight py-0.5">
                new
              </div>
              <button
                type="button"
                onClick={() => removeNewImage(i)}
                className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Drop / click zone */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`w-16 h-16 flex-shrink-0 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors ${
            dragOver
              ? "border-indigo-400 bg-indigo-50"
              : "border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50"
          }`}
        >
          <ImagePlus className="w-4 h-4 text-gray-400" />
          <span className="text-[10px] text-gray-400 leading-none">Add</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
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

  const [updateProduct] = useMutation(UPDATE_PRODUCT, {
    refetchQueries: ["GetProducts", "GetProduct"],
  });
  const [createVariant] = useMutation(CREATE_VARIANT, {
    refetchQueries: ["GetProducts", "GetProduct"],
  });
  const [updateVariant] = useMutation(UPDATE_VARIANT, {
    refetchQueries: ["GetProducts", "GetProduct"],
  });
  const [deleteVariant] = useMutation(DELETE_VARIANT, {
    refetchQueries: ["GetProducts", "GetProduct"],
  });

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
        existingImages: (v.images ?? []).map((img: any) => ({
          id: img.id,
          url: img.url,
        })),
        newImages: [],
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

  const handleRemoveExistingImage = (variantIndex: number, imageId: string) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              existingImages: v.existingImages.filter((img) => img.id !== imageId),
            }
          : v,
      ),
    );
  };

  const handleNewImagesChange = (variantIndex: number, files: File[]) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex ? { ...v, newImages: files } : v,
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
      // 1. Delete removed variants first to avoid duplicate SKU conflicts
      for (const vid of deletedVariantIds) {
        await deleteVariant({ variables: { id: vid } });
      }

      // 2. Update product basic info
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
        const variantInput: Record<string, unknown> = {
          productId: id,
          sku: v.sku.trim(),
          name: v.name.trim(),
          price: parseFloat(v.price) || 0,
          weightGrams: parseInt(v.weightGrams) || 0,
          isActive: v.isActive,
          ...(v.newImages.length > 0 ? { images: v.newImages } : {}),
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

                    {/* Image Upload / Preview */}
                    <VariantImageUpload
                      existingImages={variant.existingImages}
                      newImages={variant.newImages}
                      onRemoveExisting={(imgId) =>
                        handleRemoveExistingImage(index, imgId)
                      }
                      onNewImagesChange={(files) =>
                        handleNewImagesChange(index, files)
                      }
                    />

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
                    setForm((prev) => ({ ...prev, categoryIds: values }));
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