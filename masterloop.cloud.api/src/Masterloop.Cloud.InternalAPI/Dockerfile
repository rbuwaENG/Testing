#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:5.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
ENV ASPNETCORE_URLS=http://+:5001
WORKDIR /src
COPY ["src/Masterloop.Cloud.InternalAPI/Masterloop.Cloud.InternalAPI.csproj", "src/Masterloop.Cloud.InternalAPI/"]
COPY ["src/Masterloop.Cloud.BusinessLayer/Masterloop.Cloud.BusinessLayer.csproj", "src/Masterloop.Cloud.BusinessLayer/"]
COPY ["submodules/Masterloop.Core.Types/src/Masterloop.Core.Types/Masterloop.Core.Types.csproj", "submodules/Masterloop.Core.Types/src/Masterloop.Core.Types/"]
COPY ["src/Masterloop.Cloud.Storage/Masterloop.Cloud.Storage.csproj", "src/Masterloop.Cloud.Storage/"]
COPY ["src/Masterloop.Cloud.Core/Masterloop.Cloud.Core.csproj", "src/Masterloop.Cloud.Core/"]
RUN dotnet restore "src/Masterloop.Cloud.InternalAPI/Masterloop.Cloud.InternalAPI.csproj"
COPY . .
WORKDIR "/src/src/Masterloop.Cloud.InternalAPI"
RUN dotnet build "Masterloop.Cloud.InternalAPI.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Masterloop.Cloud.InternalAPI.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Masterloop.Cloud.InternalAPI.dll"]
