import React from 'react';
import SignInForm from '../components/SignInForm.jsx'; 

const SignInPage = () => {
  return (
    <main className="flex justify-center items-center min-h-screen"> 
        <div>
          <SignInForm /> 
        </div> 
    </main> 
  );
};

export default SignInPage;