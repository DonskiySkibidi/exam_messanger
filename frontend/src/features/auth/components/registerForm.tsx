"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AuthWrapper, RegisterSchema, TypeRegisterSchema, useRegisterMutation } from "@/src/features/auth";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/shared/components";
import { departmentOptions } from "@/src/shared/utils";
export function RegisterForm() {
  const form = useForm<TypeRegisterSchema>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      department: "",
      password: "",
      passwordRepeat: "",
    },
  });

  const { register, isLoadingRegister } = useRegisterMutation();

  const onSubmit = (values: TypeRegisterSchema) => {
    register({ values });
  };
  return (
    <AuthWrapper
      heading="Регистрация"
      description="Чтобы создать аккаунт введите необходимые данные"
      backButtonHref="/auth/login"
      backButtonLabel="Уже есть аккаунт? Войти"
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        name="create-account"
        id="create-account"
        className="grid gap-2"
      >
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Имя</FieldLabel>
                <Input
                  disabled={isLoadingRegister}
                  {...field}
                  id="name"
                  aria-invalid={fieldState.invalid}
                  placeholder="Иван"
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Почта</FieldLabel>
                <Input
                  disabled={isLoadingRegister}
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
                  disabled={isLoadingRegister}
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
          <Controller
            name="passwordRepeat"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="passwordRepeat">
                  Повторите пароль
                </FieldLabel>
                <Input
                  disabled={isLoadingRegister}
                  {...field}
                  id="passwordRepeat"
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
          <Controller
            name="department"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="department">Департамент</FieldLabel>
                <Select
                  disabled={isLoadingRegister}
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="department"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Выберете" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions().map((obj) => {
                      return (
                        <SelectItem key={obj.value} value={obj.value}>
                          {obj.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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
          disabled={isLoadingRegister}
          className="w-full"
          type="submit"
          form="create-account"
        >
          Создать аккаунт
        </Button>
        <Button
          disabled={isLoadingRegister}
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
