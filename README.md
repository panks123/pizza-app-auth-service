# Authentication Service

## Overview

This Authentication Service provides secure user authentication and authorization functionalities for my pizaa app. It supports features like user registration, login, logout, password reset, and role-based access control (RBAC).

## Features

- **User Registration**: Allow users to sign up for an account by providing required information.
- **User Login**: Authenticate users by verifying their credentials and issuing access tokens.
- **User Logout**: Provide endpoints for users to log out and invalidate their access tokens.
- **Role-Based Access Control (RBAC)**: Control access to resources based on user roles and permissions.

## Technologies

- **Node.js**: JavaScript runtime environment for building server-side applications.
- **Express.js**: Web application framework for Node.js used for building APIs.
- **JSON Web Tokens (JWT)**: Securely transmit information between parties as JSON objects.
- **bcrypt**: Hash passwords securely before storing them in the database.
- **PostgreSQL**: Open-source RDBMS for storing users data.
