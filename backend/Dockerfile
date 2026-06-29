# Stage 1: Build Backend
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
# Copy pom.xml and resolve dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B
# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run Backend
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Copy built jar file
COPY --from=build /app/target/*.jar app.jar
# Expose port 8080
EXPOSE 8080
# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
