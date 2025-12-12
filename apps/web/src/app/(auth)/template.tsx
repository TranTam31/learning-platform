import React from "react";

// ồ, cái template này nó là tự động của bên Nextjs nha
// nhưng mà sao nó khác với layout à? Nó khác như nào nhể

interface TemplateProps {
  children: React.ReactNode;
}

const Template: React.FC<TemplateProps> = ({ children }) => {
  return (
    <div
      className="
      h-screen
      p-6 flex 
      justify-center"
    >
      {children}
    </div>
  );
};

export default Template;
