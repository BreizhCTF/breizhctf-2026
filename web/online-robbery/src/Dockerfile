FROM gradle:8.5-jdk21 AS builder
WORKDIR /workspace/app

COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

RUN chmod +x gradlew

COPY src src
RUN [ -f src/flag.txt ] || echo "BZHCTF{PLACEHOLDER}" > src/flag.txt

RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /workspace/app/build/libs/*.jar app.jar

COPY --from=builder /workspace/app/src/flag.txt /flag.txt

ENTRYPOINT ["java", "-jar", "app.jar"]
