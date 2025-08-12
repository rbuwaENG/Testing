#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/runtime:6.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY ["src/Masterloop.Cloud.HistorianWorker/Masterloop.Cloud.HistorianWorker.csproj", "src/Masterloop.Cloud.HistorianWorker/"]
COPY ["src/Masterloop.Cloud.Storage/Masterloop.Cloud.Storage.csproj", "src/Masterloop.Cloud.Storage/"]
COPY ["src/Masterloop.Cloud.Core/Masterloop.Cloud.Core.csproj", "src/Masterloop.Cloud.Core/"]
COPY ["submodules/Masterloop.Core.Types/src/Masterloop.Core.Types/Masterloop.Core.Types.csproj", "submodules/Masterloop.Core.Types/src/Masterloop.Core.Types/"]
COPY ["src/Masterloop.Cloud.BusinessLayer/Masterloop.Cloud.BusinessLayer.csproj", "src/Masterloop.Cloud.BusinessLayer/"]
COPY ["submodules/Masterloop.Core.Units/src/Masterloop.Core.Units/Masterloop.Core.Units.csproj", "submodules/Masterloop.Core.Units/src/Masterloop.Core.Units/"]
RUN dotnet restore "src/Masterloop.Cloud.HistorianWorker/Masterloop.Cloud.HistorianWorker.csproj"
COPY . .
WORKDIR "/src/src/Masterloop.Cloud.HistorianWorker"
RUN dotnet build "Masterloop.Cloud.HistorianWorker.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Masterloop.Cloud.HistorianWorker.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Masterloop.Cloud.HistorianWorker.dll"]