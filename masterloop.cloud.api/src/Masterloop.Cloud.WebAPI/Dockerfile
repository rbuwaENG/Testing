#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY ["src/Masterloop.Cloud.WebAPI/Masterloop.Cloud.WebAPI.csproj", "src/Masterloop.Cloud.WebAPI/"]
COPY ["src/Masterloop.Cloud.BusinessLayer/Masterloop.Cloud.BusinessLayer.csproj", "src/Masterloop.Cloud.BusinessLayer/"]
COPY ["src/Masterloop.Cloud.Storage/Masterloop.Cloud.Storage.csproj", "src/Masterloop.Cloud.Storage/"]
COPY ["src/Masterloop.Cloud.Core/Masterloop.Cloud.Core.csproj", "src/Masterloop.Cloud.Core/"]
COPY ["submodules/Masterloop.Core.Types/src/Masterloop.Core.Types/Masterloop.Core.Types.csproj", "submodules/Masterloop.Core.Types/src/Masterloop.Core.Types/"]
COPY ["submodules/Masterloop.Core.Units/src/Masterloop.Core.Units/Masterloop.Core.Units.csproj", "submodules/Masterloop.Core.Units/src/Masterloop.Core.Units/"]
RUN dotnet restore "src/Masterloop.Cloud.WebAPI/Masterloop.Cloud.WebAPI.csproj"
COPY . .
WORKDIR "/src/src/Masterloop.Cloud.WebAPI"
RUN dotnet build "Masterloop.Cloud.WebAPI.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Masterloop.Cloud.WebAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Masterloop.Cloud.WebAPI.dll"]