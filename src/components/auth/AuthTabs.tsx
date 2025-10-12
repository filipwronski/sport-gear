import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export interface AuthTabsProps {
  activeTab: "login" | "register";
  onTabChange: (tab: "login" | "register") => void;
  onAuthSuccess: () => void;
  onForgotPassword: () => void;
}

const AuthTabs: React.FC<AuthTabsProps> = ({
  activeTab,
  onTabChange,
  onAuthSuccess,
  onForgotPassword,
}) => {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as "login" | "register")}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Zaloguj się</TabsTrigger>
        <TabsTrigger value="register">Zarejestruj się</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="mt-6">
        <LoginForm
          onSuccess={onAuthSuccess}
          onForgotPassword={onForgotPassword}
        />
      </TabsContent>

      <TabsContent value="register" className="mt-6">
        <RegisterForm onSuccess={onAuthSuccess} />
      </TabsContent>
    </Tabs>
  );
};

export default AuthTabs;
