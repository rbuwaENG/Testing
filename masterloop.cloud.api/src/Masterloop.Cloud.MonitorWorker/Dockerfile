#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:5.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
WORKDIR /src
COPY ["src/Masterloop.Cloud.MonitorWorker/Masterloop.Cloud.MonitorWorker.csproj", "src/Masterloop.Cloud.MonitorWorker/"]
RUN dotnet restore "src/Masterloop.Cloud.MonitorWorker/Masterloop.Cloud.MonitorWorker.csproj"
COPY . .
WORKDIR "/src/src/Masterloop.Cloud.MonitorWorker"
RUN dotnet build "Masterloop.Cloud.MonitorWorker.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Masterloop.Cloud.MonitorWorker.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MonitorWorker.dll"]