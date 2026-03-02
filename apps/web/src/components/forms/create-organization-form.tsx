"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader } from "lucide-react";
import { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  slug: z.string().min(2, "Slug must be at least 2 characters").max(50),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateOrganizationForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    mode: "onChange",
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit: SubmitHandler<FormValues> = async (formData) => {
    setSubmitError(null);
    try {
      const { error } = await authClient.organization.create({
        name: formData.name,
        slug: formData.slug,
      });

      if (error) {
        setSubmitError(error.message || "Failed to create organization");
        toast.error(error.message || "Failed to create organization");
      } else {
        toast.success("Organization created successfully");
        form.reset();
      }
    } catch (err) {
      setSubmitError("An unexpected error occurred");
      console.error(err);
    }
  };

  return (
    <Card className="w-full sm:max-w-md">
      <CardHeader>
        <CardTitle>Create Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="create-org-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="org-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="org-name"
                    placeholder="My Organization"
                    disabled={isLoading}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="slug"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="org-slug">Slug</FieldLabel>
                  <Input
                    {...field}
                    id="org-slug"
                    placeholder="my-org"
                    disabled={isLoading}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="vertical" className="w-full">
          {submitError && <FieldError>{submitError}</FieldError>}
          <Button
            type="submit"
            className="w-full"
            form="create-org-form"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader className="size-4 animate-spin" />
            ) : (
              "Create Organization"
            )}
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
