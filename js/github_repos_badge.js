
var GithubReposBadge = function (obj, user, repos_to_show) {
  this.obj = $(obj);
  this.user = user;
  this.repos_to_show = repos_to_show || 5;
  
  this.filters = {};
  
  this.filters['all'] = function (repo) {
    return true;
  };
  
  this.filters['source'] = function (repo) {
    return !repo.fork;
  };
  
  this.filters['fork'] = function (repo) {
    return repo.fork;
  };
  
  this.filter = this.filters['source'];
  
  this.render = function () {
    this.obj.empty();
    this.obj.addClass("repos");
    
    var top_bar = $("<div class='top_bar'><h2>" + this.user + "'s Repositories</h2></div>");
    this.obj.append(top_bar);
    
    var filter_bar = $("<div class='filter_bar'>" +
                          "<input type='search' class='filter_input native' placeholder='Find a repository&hellip;'>" +
                          "<ul class='repo_filterer'>" +
                            "<li class='all_repos'><a href='#' class='repo_filter' rel='all'>All Repositories</a></li>" +
                            "<li><a href='#' class='repo_filter' rel='source'>Sources</a></li>" +
                            "<li><a href='#' class='repo_filter' rel='fork'>Forks</a></li>" +
                          "</ul>" +
                        "</div>");
    this.obj.append(filter_bar);
    
    filter_bar.find("a").each(function (i, el) {
      $(el).click(function () {
        self.filter = self.filters[el.rel];
        callback(GithubReposBadge.userCache[self.user].repos_show);
      });
      
    });
    
    var repo_list = $("<ul class='repo_list'>" +
                        "<li class='loading'><span>Loading&hellip;</span></li>" +
                      "</ul>");
    this.obj.append(repo_list);
    
    var bottom_bar = $("<div class='bottom_bar'></div>");
    this.obj.append(bottom_bar);
    
    // From Nick Fitzgerald github.js
    var id = +new Date;
    while (GithubReposBadge.callbacks[id] !== undefined) {
      id += Math.random(); // Avoid slight possibility of id clashes.
    }
    
    var self = this;
    var callback = function (data) {
      if (GithubReposBadge.callbacks[id]) {
        delete GithubReposBadge.callbacks[id];
      }
      
      if (GithubReposBadge.userCache[self.user] === undefined ||
          GithubReposBadge.userCache[self.user].repos_show === undefined) {
        // Sort repos
        data.repositories.sort(function (a, b) {
          a = a.pushed_at || a.created_at;
          b = b.pushed_at || b.created_at;
          
          return (a == b) ? 0 : (Date.parse(a) > Date.parse(b) ? -1 : 1);
        });
          
        GithubReposBadge.userCache[self.user] = {};
        GithubReposBadge.userCache[self.user].repos_show = data;
      }
      
      // Filter data
      repositories = data.repositories.filter(function (repo) {
        return self.filter(repo);
      });
      
      // Calc valid count to show
      var repos_to_show = repositories.length > self.repos_to_show ? self.repos_to_show : repositories.length;
      
      // Update top_bar with repos count
      top_bar.find("h2").first().html(self.user + "'s Repositories <em>(" + data.repositories.length + ")</em>");
      
      // Highlight current filter
      filter_bar.find("a").each(function (i, el) {
        if (self.filter === self.filters[el.rel]) {
          $(el).addClass("filter_selected");
        } else {
          $(el).removeClass("filter_selected");
        }
      });
      
      // Remove loading indicator
      repo_list.empty();
      
      // Render list
      var i, repo, li;
      for (i = 0; i < repos_to_show; i += 1) {
        repo = repositories[i];
        li = $("<li class='" + (repo.fork ? "fork" : "source") + "'>" +
                 "<a href='" + repo.url + "'>" +
                   "<span class='owner'>" + repo.owner + "</span>/<span class='repo'>" + repo.name + "</span>" +
                 "</a>" +
               "</li>");
        repo_list.append(li);
      }
      
      // Update bottom_bar with repos count
      if (repos_to_show != repositories.length) {
        bottom_bar.html("<a href='#' class='show_more'>Show " + (repositories.length - repos_to_show) + " more repositories&hellip;</a>");
      } else {
        bottom_bar.empty();
      }
      
      // Add 'show more' handler
      bottom_bar.find("a").first().click(function () {
        self.repos_to_show = data.repositories.length;
        callback(GithubReposBadge.userCache[self.user].repos_show);
      });
    };
    
    if (GithubReposBadge.userCache[self.user] === undefined ||
        GithubReposBadge.userCache[self.user].repos_show === undefined) {
      GithubReposBadge.callbacks[id] = callback;
      
      $.getScript('http://github.com/api/v2/json/repos/show/' + this.user + "?callback=" + encodeURIComponent("GithubReposBadge.callbacks[" + id + "]"));
    } else {
      callback(GithubReposBadge.userCache[this.user].repos_show);
    }
  };
}

GithubReposBadge.callbacks = {};
GithubReposBadge.userCache = {};
