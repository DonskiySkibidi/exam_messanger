"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AuthWrapper, LoginSchema, TypeLoginSchema, useLoginMutation } from "@/src/features/auth";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  toast,
} from "@/src/shared/components";
export function LoginForm() {
  const form = useForm<TypeLoginSchema>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { login, isLoadingLogin } = useLoginMutation();

  const onSubmit = (values: TypeLoginSchema) => {
    login({ values });
  };
  return (
    <AuthWrapper
      heading="Войти"
      description="Чтобы войти введите email и пароль"
      backButtonHref="/auth/register"
      backButtonLabel="Нет аккаунта? Регистрация"
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        name="create-account"
        id="create-account"
        className="grid gap-2"
      >
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Почта</FieldLabel>
                <Input
                  disabled={isLoadingLogin}
                  {...field}
                  id="email"
                  type="email"
                  aria-invalid={fieldState.invalid}
                  placeholder="Ivan@example.com"
                  autoComplete="on"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="password">Пароль</FieldLabel>
                <Input
                  disabled={isLoadingLogin}
                  {...field}
                  id="password"
                  type="password"
                  aria-invalid={fieldState.invalid}
                  placeholder="******"
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
      </form>
      <Field className="grid gap-2 mt-5">
        <Button
          disabled={isLoadingLogin}
          className="w-full"
          type="submit"
          form="create-account"
        >
          Войти
        </Button>
        <Button
          disabled={isLoadingLogin}
          variant="secondary"
          className="w-full"
          onClick={() => form.reset()}
          type="button"
          form="create-account"
        >
          Сбросить
        </Button>
      </Field>
    </AuthWrapper>
  );
}
